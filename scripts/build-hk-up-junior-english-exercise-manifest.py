#!/usr/bin/env python3
"""Build local-only metadata artifacts for HK UP junior English exercise packs.

The script recursively inspects the owner-provided attachment ZIP and nested
ZIPs. It records fingerprints, checksums, sizes, grade/volume signals, resource
family signals, and aggregate coverage only. It does not persist raw member
paths, file names, DOCX body text, document XML text, PDF/OCR text, exercise
wording, worked responses, figures, tables, page locators, source excerpts, or
embeddings. Default outputs live under `.local/`, which is ignored by Git.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import tempfile
from collections import Counter, defaultdict
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from zipfile import BadZipFile, ZIP_DEFLATED, ZipFile


DEFAULT_OUT_DIR = Path(".local/rag/hk-up-junior-en-exercises")
EXPECTED_VOLUMES = ["1A", "1B", "2A", "2B", "3A", "3B"]
VOLUME_TO_GRADE = {
    "1A": "S1",
    "1B": "S1",
    "2A": "S2",
    "2B": "S2",
    "3A": "S3",
    "3B": "S3",
}
PRIMARY_EXERCISE_MATERIAL_KINDS = [
    "lesson-worksheet",
    "question-bank",
    "solution-support",
    "quick-practice",
    "side-feature-practice",
    "challenge-practice",
    "tsa-type-practice",
    "hkdse-style-practice",
    "assessment-practice",
]
SAFETY_NOTE = (
    "Local metadata-only artifact for Hong Kong UP junior English S1-S3 "
    "exercise resources. Do not commit raw archives, private archive paths, "
    "file names, DOCX body text, document XML text, PDF/OCR text, exercise "
    "wording, worked responses, figures, tables, page locators, source "
    "excerpts, or embeddings."
)


def iso_modified_at(date_time: tuple[int, int, int, int, int, int]) -> str:
    year, month, day, hour, minute, second = date_time
    return datetime(year, month, day, hour, minute, second, tzinfo=timezone.utc).isoformat()


def is_junk_path(path: str) -> bool:
    parts = path.split("/")
    file_name = parts[-1]
    return parts[0] == "__MACOSX" or file_name == ".DS_Store" or file_name.startswith("._")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while True:
            chunk = handle.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def normalized_path(path: str) -> str:
    return path.lower().replace("\\", "/").replace("_", " ").replace("-", " ")


def extension_from_path(path: str) -> str:
    suffix = Path(path).suffix.lower()
    return suffix or "<none>"


def volume_from_path(path: str) -> str:
    match = re.search(r"([123][AB])(?:\s|_|-)?(?:[0-9]{2})?", path, flags=re.IGNORECASE)
    if match:
        return match.group(1).upper()
    return "cross-junior" if any(token in normalized_path(path) for token in ["hkdse", "tsa", "assessment"]) else "unknown"


def unit_code_from_path(path: str) -> str | None:
    match = re.search(r"([123][AB][0-9]{2})", path, flags=re.IGNORECASE)
    return match.group(1).upper() if match else None


def grade_for_volume(volume: str) -> str:
    if volume == "cross-junior":
        return "S1-S3"
    return VOLUME_TO_GRADE.get(volume, "unknown")


def material_kind_from_path(path: str, extension: str) -> str:
    lower = normalized_path(path)
    if extension == ".zip":
        return "nested-archive"
    if "teaching ppt" in lower:
        return "teaching-ppt"
    if "teaching example" in lower:
        return "teaching-support"
    if "hkdse" in lower:
        return "hkdse-style-practice"
    if "tsa" in lower:
        return "tsa-type-practice"
    if "continuous assessment" in lower or "eya" in lower:
        return "assessment-practice"
    if "lesson worksheet" in lower or "lessonws" in lower:
        return "lesson-worksheet"
    if "question bank" in lower or "sample qb" in lower:
        return "question-bank"
    if "full solution" in lower or "exercise e" in lower or "olr fs" in lower:
        return "solution-support"
    if "quick practice" in lower:
        return "quick-practice"
    if "side feature" in lower:
        return "side-feature-practice"
    if "challenging" in lower:
        return "challenge-practice"
    return "unknown"


def source_role_from_path(path: str, material_kind: str, extension: str) -> str:
    lower = normalized_path(path)
    if extension == ".zip":
        return "nested-archive"
    if material_kind in {"teaching-ppt", "teaching-support"}:
        return "teacher-support"
    if material_kind in {"solution-support", "quick-practice", "side-feature-practice"}:
        return "response-support"
    if "sol" in lower or "solution" in lower or "response" in lower:
        return "response-support"
    if "teacher" in lower or re.search(r"(^|[\s/])te($|[\s/])", lower):
        return "teacher-support"
    if material_kind == "unknown":
        return "unknown"
    return "student-practice"


def review_flags_for_entry(material_kind: str, source_role: str, volume: str, grade: str, extension: str, nested_error: str | None) -> list[str]:
    review_flags: list[str] = []
    if extension not in {".docx", ".pdf", ".zip", ".pptx"}:
        review_flags.append("non-standard-extension")
    if material_kind == "unknown":
        review_flags.append("unknown-material-kind")
    if material_kind in {"teaching-ppt", "teaching-support"}:
        review_flags.append("not-primary-exercise-resource")
    if volume == "unknown":
        review_flags.append("unknown-volume")
    if grade == "unknown":
        review_flags.append("unknown-grade")
    if source_role == "unknown":
        review_flags.append("unknown-source-role")
    if source_role == "response-support":
        review_flags.append("response-support-only")
    if nested_error:
        review_flags.append(nested_error)
    return review_flags


def path_fingerprint(path: str, depth: int, parent_archive_fingerprint: str) -> str:
    payload = f"{depth}:{parent_archive_fingerprint}:{path}".encode("utf-8", errors="replace")
    return hashlib.sha256(payload).hexdigest()


def ignored_entry(path: str, info_size: int, depth: int, parent_archive_fingerprint: str, reason: str) -> dict[str, object]:
    return {
        "entryFingerprint": path_fingerprint(path, depth, parent_archive_fingerprint),
        "archiveDepth": depth,
        "sizeBytes": info_size,
        "reason": reason,
    }


def build_entry(path: str, info_size: int, zip_crc32: int, modified_at: str, entry_sha256: str, depth: int, parent_archive_fingerprint: str, nested_error: str | None) -> dict[str, object]:
    extension = extension_from_path(path)
    material_kind = material_kind_from_path(path, extension)
    source_role = source_role_from_path(path, material_kind, extension)
    volume = volume_from_path(path)
    grade = grade_for_volume(volume)
    unit_code = unit_code_from_path(path)

    return {
        "entryFingerprint": path_fingerprint(path, depth, parent_archive_fingerprint),
        "parentArchiveFingerprint": parent_archive_fingerprint,
        "archiveDepth": depth,
        "sourceFamily": "hk-up-junior-english-exercise-resources",
        "sourceLanguage": "en",
        "materialKind": material_kind,
        "sourceRole": source_role,
        "volume": volume,
        "grade": grade,
        "unitCodeFingerprint": hashlib.sha256(unit_code.encode("utf-8")).hexdigest() if unit_code else None,
        "extension": extension,
        "sizeBytes": info_size,
        "zipCrc32": f"{zip_crc32:08x}",
        "sha256": entry_sha256,
        "modifiedAt": modified_at,
        "retention": "local-metadata-only",
        "machineTextStatus": "not-attempted",
        "bodyTextPersisted": False,
        "sourceLocatorsPersisted": False,
        "embeddingsPersisted": False,
        "reviewFlags": review_flags_for_entry(material_kind, source_role, volume, grade, extension, nested_error),
    }


def inspect_archive_bytes(archive_bytes: bytes, archive_fingerprint: str, depth: int, max_depth: int) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    entries: list[dict[str, object]] = []
    ignored: list[dict[str, object]] = []
    try:
        archive = ZipFile(BytesIO(archive_bytes))
    except BadZipFile:
        return entries, [{
            "entryFingerprint": archive_fingerprint,
            "archiveDepth": depth,
            "sizeBytes": len(archive_bytes),
            "reason": "nested-zip-read-failed",
        }]

    with archive:
        for info in archive.infolist():
            if info.is_dir():
                continue
            if is_junk_path(info.filename):
                ignored.append(ignored_entry(info.filename, info.file_size, depth, archive_fingerprint, "macos-or-hidden-metadata"))
                continue

            data = archive.read(info.filename)
            entry_sha256 = sha256_bytes(data)
            extension = extension_from_path(info.filename)
            nested_error = None
            if extension == ".zip" and depth >= max_depth:
                nested_error = "nested-depth-limit"

            entries.append(build_entry(
                info.filename,
                info.file_size,
                info.CRC,
                iso_modified_at(info.date_time),
                entry_sha256,
                depth,
                archive_fingerprint,
                nested_error,
            ))

            if extension == ".zip" and depth < max_depth:
                nested_entries, nested_ignored = inspect_archive_bytes(data, entry_sha256, depth + 1, max_depth)
                entries.extend(nested_entries)
                ignored.extend(nested_ignored)

    return entries, ignored


def inspect_source_zip(source_zip: Path, max_depth: int) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    source_bytes = source_zip.read_bytes()
    return inspect_archive_bytes(source_bytes, sha256_bytes(source_bytes), 0, max_depth)


def coverage_counts(entries: list[dict[str, object]], material_kind: str) -> dict[str, int]:
    by_volume: dict[str, set[str]] = defaultdict(set)
    for entry in entries:
        if entry["materialKind"] != material_kind:
            continue
        fingerprint = entry.get("unitCodeFingerprint") or entry["entryFingerprint"]
        by_volume[str(entry["volume"])].add(str(fingerprint))
    return {volume: len(by_volume[volume]) for volume in sorted(by_volume)}


def group_duplicate_hashes(entries: list[dict[str, object]]) -> list[dict[str, object]]:
    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
    for entry in entries:
        grouped[str(entry["sha256"])].append({
            "materialKind": str(entry["materialKind"]),
            "sourceRole": str(entry["sourceRole"]),
            "volume": str(entry["volume"]),
            "grade": str(entry["grade"]),
            "archiveDepth": str(entry["archiveDepth"]),
        })
    return [
        {"sha256": digest, "entries": grouped_entries}
        for digest, grouped_entries in sorted(grouped.items())
        if len(grouped_entries) > 1
    ]


def summarize_entries(entries: list[dict[str, object]], ignored: list[dict[str, object]]) -> dict[str, object]:
    primary_entries = [entry for entry in entries if entry["materialKind"] in PRIMARY_EXERCISE_MATERIAL_KINDS]
    material_kind_counts = Counter(str(entry["materialKind"]) for entry in entries)
    volume_values = {str(entry["volume"]) for entry in primary_entries}

    return {
        "totals": {
            "entries": len(entries),
            "primaryExerciseEntries": len(primary_entries),
            "ignoredEntries": len(ignored),
            "docxFiles": sum(1 for entry in entries if entry["extension"] == ".docx"),
            "pdfFiles": sum(1 for entry in entries if entry["extension"] == ".pdf"),
            "zipFiles": sum(1 for entry in entries if entry["extension"] == ".zip"),
            "uncompressedBytes": sum(int(entry["sizeBytes"]) for entry in entries),
        },
        "languageCounts": dict(sorted(Counter(str(entry["sourceLanguage"]) for entry in entries).items())),
        "materialKindCounts": dict(sorted(material_kind_counts.items())),
        "sourceRoleCounts": dict(sorted(Counter(str(entry["sourceRole"]) for entry in entries).items())),
        "volumeCounts": dict(sorted(Counter(str(entry["volume"]) for entry in entries).items())),
        "gradeCounts": dict(sorted(Counter(str(entry["grade"]) for entry in entries).items())),
        "extensionCounts": dict(sorted(Counter(str(entry["extension"]) for entry in entries).items())),
        "archiveDepthCounts": dict(sorted(Counter(str(entry["archiveDepth"]) for entry in entries).items())),
        "coverage": {
            "expectedVolumes": EXPECTED_VOLUMES,
            "missingExpectedVolumes": sorted(set(EXPECTED_VOLUMES) - volume_values),
            "expectedPrimaryExerciseMaterialKinds": PRIMARY_EXERCISE_MATERIAL_KINDS,
            "missingPrimaryExerciseMaterialKinds": sorted(set(PRIMARY_EXERCISE_MATERIAL_KINDS) - set(material_kind_counts)),
            "unitSignalCountsByKind": {
                kind: coverage_counts(entries, kind)
                for kind in PRIMARY_EXERCISE_MATERIAL_KINDS
                if material_kind_counts[kind]
            },
        },
        "anomalies": {
            "reviewNeeded": [
                {
                    "materialKind": str(entry["materialKind"]),
                    "sourceRole": str(entry["sourceRole"]),
                    "volume": str(entry["volume"]),
                    "grade": str(entry["grade"]),
                    "archiveDepth": int(entry["archiveDepth"]),
                    "reviewFlags": entry["reviewFlags"],
                    "entryFingerprint": str(entry["entryFingerprint"]),
                }
                for entry in entries
                if entry["reviewFlags"]
            ],
            "duplicateHashes": group_duplicate_hashes(entries),
        },
    }


def build_manifest(source_zip: Path, max_depth: int) -> dict[str, object]:
    resolved = source_zip.expanduser().resolve()
    if not resolved.exists():
        raise FileNotFoundError(f"Archive path not found: {resolved}")
    if resolved.suffix.lower() != ".zip":
        raise ValueError(f"Expected a ZIP archive: {resolved}")

    entries, ignored = inspect_source_zip(resolved, max_depth)
    summary = summarize_entries(entries, ignored)
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceFamily": "Hong Kong UP junior S1-S3 English exercise resources",
        "sourceArchive": {
            "nameFingerprint": hashlib.sha256(resolved.name.encode("utf-8", errors="replace")).hexdigest(),
            "sha256": sha256_file(resolved),
            "sizeBytes": resolved.stat().st_size,
        },
        "safetyNote": SAFETY_NOTE,
        "maxArchiveDepth": max_depth,
        **summary,
        "entries": entries,
        "ignoredEntries": ignored,
    }


def qa_report(manifest: dict[str, object]) -> str:
    totals = manifest["totals"]  # type: ignore[index]
    coverage = manifest["coverage"]  # type: ignore[index]
    return "\n".join([
        "# HK UP Junior English Exercise Local Manifest QA",
        "",
        f"- Generated at: {manifest['generatedAt']}",
        f"- Entries inspected: {totals['entries']}",
        f"- Primary exercise entries: {totals['primaryExerciseEntries']}",
        f"- DOCX files: {totals['docxFiles']}",
        f"- PDF files: {totals['pdfFiles']}",
        f"- ZIP files: {totals['zipFiles']}",
        f"- Ignored metadata entries: {totals['ignoredEntries']}",
        f"- Missing expected volumes: {json.dumps(coverage['missingExpectedVolumes'], ensure_ascii=False)}",
        f"- Missing primary exercise material kinds: {json.dumps(coverage['missingPrimaryExerciseMaterialKinds'], ensure_ascii=False)}",
        f"- Safety note: {SAFETY_NOTE}",
        "",
        "## Safety Gate",
        "",
        "- Passed: output artifacts contain fingerprints, checksums, size signals, grade/volume signals, material-kind signals, role signals, and aggregate coverage only.",
        "- Passed: no raw member paths, file names, DOCX body text, document XML text, PDF/OCR text, exercise wording, worked responses, figures, tables, page locators, source excerpts, or vector payloads are persisted.",
        "- Required before student-facing production use: S18 source-distance review of generated outputs against these safe abstraction cards.",
        "",
    ]) + "\n"


def write_outputs(manifest: dict[str, object], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / "qa-report.md").write_text(qa_report(manifest), encoding="utf-8")


def create_nested_zip() -> bytes:
    buffer = BytesIO()
    with ZipFile(buffer, "w", compression=ZIP_DEFLATED) as archive:
        archive.writestr("root/HKDSE-style Questions/3B10_HKDSE_e.docx", b"fake hkdse style practice")
        archive.writestr("root/TSA-type Questions/2A02_TSA_e.docx", b"fake tsa style practice")
        archive.writestr("root/.DS_Store", b"ignored")
    return buffer.getvalue()


def create_self_test_zip(root: Path) -> Path:
    source_zip = root / "hk-up-junior-en-exercises.zip"
    with ZipFile(source_zip, "w", compression=ZIP_DEFLATED) as archive:
        archive.writestr("__MACOSX/root/._ignored.docx", b"ignored")
        archive.writestr("root/Lesson Worksheets/1A01_LessonWS_e.docx", b"fake worksheet")
        archive.writestr("root/Question Bank Word Files/Sample_QB_1A_Ch06.docx", b"fake question bank")
        archive.writestr("root/Full Solutions to Exercises/1B12_Exercise_E.docx", b"fake response support")
        archive.writestr("root/Teaching PPT/1A/1A01_overview.pdf", b"fake non-primary pdf")
        archive.writestr("root/Nested practice.zip", create_nested_zip())
    return source_zip


def run_self_test() -> None:
    with tempfile.TemporaryDirectory() as temp_dir:
        source_zip = create_self_test_zip(Path(temp_dir))
        manifest = build_manifest(source_zip, max_depth=3)

    assert manifest["totals"]["entries"] == 7, manifest["totals"]
    assert manifest["totals"]["ignoredEntries"] == 2, manifest["totals"]
    assert manifest["totals"]["docxFiles"] == 5, manifest["totals"]
    assert manifest["totals"]["zipFiles"] == 1, manifest["totals"]
    assert manifest["materialKindCounts"]["lesson-worksheet"] == 1, manifest["materialKindCounts"]
    assert manifest["materialKindCounts"]["question-bank"] == 1, manifest["materialKindCounts"]
    assert manifest["materialKindCounts"]["solution-support"] == 1, manifest["materialKindCounts"]
    assert manifest["materialKindCounts"]["hkdse-style-practice"] == 1, manifest["materialKindCounts"]
    assert manifest["materialKindCounts"]["tsa-type-practice"] == 1, manifest["materialKindCounts"]
    assert manifest["volumeCounts"]["1A"] == 3, manifest["volumeCounts"]
    assert manifest["volumeCounts"]["1B"] == 1, manifest["volumeCounts"]
    assert manifest["volumeCounts"]["2A"] == 1, manifest["volumeCounts"]
    assert manifest["volumeCounts"]["3B"] == 1, manifest["volumeCounts"]

    serialized = json.dumps(manifest, ensure_ascii=False)
    for forbidden in [
        "LessonWS_1A01",
        "Question Bank Word Files",
        "Full Solutions to Exercises",
        "HKDSE-style Questions",
        "TSA-type Questions",
        "Nested practice",
        "entryPath",
        "fileName",
    ]:
        assert forbidden not in serialized
    print("Self-test passed: HK UP junior English exercise manifest builder classified recursive metadata safely.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build local-only HK UP junior English exercise metadata artifacts.")
    parser.add_argument("--source-zip", help="Path to the owner-provided English S1-S3 exercise attachment ZIP.")
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR), help="Output directory. Defaults to ignored .local/rag/hk-up-junior-en-exercises/.")
    parser.add_argument("--max-depth", type=int, default=4, help="Maximum nested ZIP depth to inspect.")
    parser.add_argument("--self-test", action="store_true", help="Run an in-memory recursive metadata-only smoke test.")
    args = parser.parse_args()

    if args.self_test:
        run_self_test()
        return

    if not args.source_zip:
        raise SystemExit("Missing required archive argument: --source-zip")

    manifest = build_manifest(Path(args.source_zip), max_depth=max(0, args.max_depth))
    write_outputs(manifest, Path(args.out_dir).expanduser())
    totals = manifest["totals"]
    print(
        "Wrote local HK UP junior English exercise manifest with "
        f"{totals['entries']} entries, {totals['docxFiles']} DOCX files, "
        f"{totals['pdfFiles']} PDF files, and {totals['zipFiles']} ZIP files "
        f"to {args.out_dir}"
    )


if __name__ == "__main__":
    main()
