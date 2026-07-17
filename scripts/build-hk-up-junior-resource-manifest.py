#!/usr/bin/env python3
"""Build a local-only metadata manifest for HK UP junior resource DOCX packs.

The script reads ZIP directory metadata and streamed entry bytes for checksums.
It does not extract DOCX body text, parse document XML, machine-read scans,
persist source prompts, worked responses, teacher notes, figures, tables,
member paths, page locators, or vector payloads.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import tempfile
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


DEFAULT_OUT_DIR = Path(".local/rag/hk-up-junior-resources")
EXPECTED_VOLUMES = ["1A", "1B", "2A", "2B", "3A", "3B"]
VOLUME_TO_GRADE = {
    "1A": "S1",
    "1B": "S1",
    "2A": "S2",
    "2B": "S2",
    "3A": "S3",
    "3B": "S3",
}
EXPECTED_JUNIOR_DSE_SETS = [f"{number:02d}" for number in range(1, 17)]
SAFETY_NOTE = (
    "Local metadata and checksums only; no DOCX body text, document XML text, "
    "protected prompt wording, worked-response wording, teacher-note wording, "
    "figures, tables, member paths, page locators, or vector payloads are "
    "extracted or persisted."
)


ARCHIVE_KINDS = {
    "worksheet": "lesson-worksheet",
    "challenge": "challenge-practice",
    "junior_dse": "junior-dse-type-practice",
}


def iso_modified_at(date_time: tuple[int, int, int, int, int, int]) -> str:
    year, month, day, hour, minute, second = date_time
    return datetime(year, month, day, hour, minute, second, tzinfo=timezone.utc).isoformat()


def is_junk_path(path: str) -> bool:
    parts = path.split("/")
    file_name = parts[-1]
    return parts[0] == "__MACOSX" or file_name == ".DS_Store" or file_name.startswith("._")


def sha256_entry(archive: ZipFile, path: str) -> str:
    digest = hashlib.sha256()
    with archive.open(path) as handle:
        while True:
            chunk = handle.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def volume_from_path(path: str) -> str:
    match = re.search(r"([123][AB])(?:[0-9]{2})", path, flags=re.IGNORECASE)
    if match:
        return match.group(1).upper()
    return "cross-junior" if "Junior_DSE" in path else "unknown"


def unit_code_from_path(path: str) -> str | None:
    match = re.search(r"([123][AB][0-9]{2})", path, flags=re.IGNORECASE)
    return match.group(1).upper() if match else None


def junior_dse_set_from_path(path: str) -> str | None:
    match = re.search(r"Junior_DSE(?:_Sol)?_([0-9]{2})c", path, flags=re.IGNORECASE)
    return match.group(1) if match else None


def grade_for_volume(volume: str) -> str:
    if volume == "cross-junior":
        return "S1-S3"
    return VOLUME_TO_GRADE.get(volume, "unknown")


def source_role_for_path(path: str, material_kind: str) -> str:
    file_name = Path(path).name
    if material_kind == "lesson-worksheet":
        if "GuidedSB" in path or "[Guide]" in file_name:
            return "guided-student"
        if "_TE" in path or "_TE_" in file_name:
            return "teacher-support"
        if "_SB" in path or "_SB_" in file_name:
            return "student-practice"
        if "intro" in file_name.lower():
            return "introductory-metadata"
        return "unknown"
    if material_kind == "challenge-practice":
        if "_Sol_" in file_name:
            return "response-support"
        if "_TE_" in file_name:
            return "teacher-support"
        if "intro" in file_name.lower():
            return "introductory-metadata"
        return "student-practice"
    if material_kind == "junior-dse-type-practice":
        if "_Sol_" in file_name:
            return "response-support"
        if "_List_" in file_name:
            return "index-metadata"
        return "student-practice"
    return "unknown"


def build_archive_entries(zip_path: Path, archive_kind: str) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    material_kind = ARCHIVE_KINDS[archive_kind]
    entries: list[dict[str, object]] = []
    ignored: list[dict[str, object]] = []
    with ZipFile(zip_path) as archive:
        for info in archive.infolist():
            if info.is_dir():
                continue

            file_name = Path(info.filename).name
            if is_junk_path(info.filename):
                ignored.append({
                    "sourceArchiveKind": archive_kind,
                    "entryFingerprint": hashlib.sha256(info.filename.encode("utf-8", errors="replace")).hexdigest(),
                    "sizeBytes": info.file_size,
                    "reason": "macos-or-hidden-metadata",
                })
                continue

            extension = Path(file_name).suffix.lower() or "<none>"
            volume = volume_from_path(info.filename)
            grade = grade_for_volume(volume)
            source_role = source_role_for_path(info.filename, material_kind)
            unit_code = unit_code_from_path(info.filename)
            review_flags = []
            if extension != ".docx":
                review_flags.append("non-docx")
            if volume == "unknown":
                review_flags.append("unknown-volume")
            if grade == "unknown":
                review_flags.append("unknown-grade")
            if source_role == "unknown":
                review_flags.append("unknown-source-role")
            if source_role == "introductory-metadata":
                review_flags.append("introductory-document")

            entries.append({
                "sourceArchiveKind": archive_kind,
                "sourceFamily": f"hk-up-junior-{material_kind}-zh",
                "languageVariant": "zh",
                "entryFingerprint": hashlib.sha256(info.filename.encode("utf-8", errors="replace")).hexdigest(),
                "unitCodeFingerprint": hashlib.sha256(unit_code.encode("utf-8")).hexdigest() if unit_code else None,
                "juniorDseSetNumber": junior_dse_set_from_path(info.filename),
                "materialKind": material_kind,
                "sourceRole": source_role,
                "volume": volume,
                "grade": grade,
                "extension": extension,
                "sizeBytes": info.file_size,
                "zipCrc32": f"{info.CRC:08x}",
                "sha256": sha256_entry(archive, info.filename),
                "modifiedAt": iso_modified_at(info.date_time),
                "retention": "local-metadata-only",
                "machineTextStatus": "not-attempted",
                "reviewFlags": review_flags,
            })

    return entries, ignored


def coverage_counts(entries: list[dict[str, object]], material_kind: str) -> dict[str, int]:
    by_volume: dict[str, set[str]] = defaultdict(set)
    for entry in entries:
        if entry["materialKind"] != material_kind:
            continue
        fingerprint = entry.get("unitCodeFingerprint")
        if not fingerprint:
            continue
        by_volume[str(entry["volume"])].add(str(fingerprint))
    return {volume: len(by_volume[volume]) for volume in sorted(by_volume)}


def group_duplicate_hashes(entries: list[dict[str, object]]) -> list[dict[str, object]]:
    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
    for entry in entries:
        grouped[str(entry["sha256"])].append({
            "sourceArchiveKind": str(entry["sourceArchiveKind"]),
            "materialKind": str(entry["materialKind"]),
            "sourceRole": str(entry["sourceRole"]),
            "volume": str(entry["volume"]),
            "grade": str(entry["grade"]),
        })
    return [
        {"sha256": digest, "entries": grouped_entries}
        for digest, grouped_entries in sorted(grouped.items())
        if len(grouped_entries) > 1
    ]


def summarize_entries(entries: list[dict[str, object]], ignored: list[dict[str, object]]) -> dict[str, object]:
    junior_dse_sets = sorted(
        str(entry["juniorDseSetNumber"])
        for entry in entries
        if entry["materialKind"] == "junior-dse-type-practice" and entry["juniorDseSetNumber"]
    )
    unique_junior_dse_sets = sorted(set(junior_dse_sets))

    return {
        "totals": {
            "entries": len(entries),
            "ignoredEntries": len(ignored),
            "docxFiles": sum(1 for entry in entries if entry["extension"] == ".docx"),
            "uncompressedBytes": sum(int(entry["sizeBytes"]) for entry in entries),
        },
        "languageCounts": dict(sorted(Counter(str(entry["languageVariant"]) for entry in entries).items())),
        "materialKindCounts": dict(sorted(Counter(str(entry["materialKind"]) for entry in entries).items())),
        "sourceRoleCounts": dict(sorted(Counter(str(entry["sourceRole"]) for entry in entries).items())),
        "volumeCounts": dict(sorted(Counter(str(entry["volume"]) for entry in entries).items())),
        "gradeCounts": dict(sorted(Counter(str(entry["grade"]) for entry in entries).items())),
        "extensionCounts": dict(sorted(Counter(str(entry["extension"]) for entry in entries).items())),
        "coverage": {
            "expectedVolumes": EXPECTED_VOLUMES,
            "missingExpectedVolumes": sorted(set(EXPECTED_VOLUMES) - {str(entry["volume"]) for entry in entries}),
            "lessonWorksheetUnitCountsByVolume": coverage_counts(entries, "lesson-worksheet"),
            "challengePracticeUnitCountsByVolume": coverage_counts(entries, "challenge-practice"),
            "juniorDseSetCount": len(unique_junior_dse_sets),
            "expectedJuniorDseSetCount": len(EXPECTED_JUNIOR_DSE_SETS),
            "missingJuniorDseSets": sorted(set(EXPECTED_JUNIOR_DSE_SETS) - set(unique_junior_dse_sets)),
        },
        "anomalies": {
            "reviewNeeded": [
                {
                    "sourceArchiveKind": str(entry["sourceArchiveKind"]),
                    "materialKind": str(entry["materialKind"]),
                    "sourceRole": str(entry["sourceRole"]),
                    "volume": str(entry["volume"]),
                    "grade": str(entry["grade"]),
                    "reviewFlags": entry["reviewFlags"],
                    "entryFingerprint": str(entry["entryFingerprint"]),
                }
                for entry in entries
                if entry["reviewFlags"]
            ],
            "duplicateHashes": group_duplicate_hashes(entries),
        },
    }


def build_manifest(worksheet_zip: Path, challenge_zip: Path, junior_dse_zip: Path) -> dict[str, object]:
    archive_specs = [
        ("worksheet", worksheet_zip),
        ("challenge", challenge_zip),
        ("junior_dse", junior_dse_zip),
    ]
    entries: list[dict[str, object]] = []
    ignored: list[dict[str, object]] = []
    source_archives = []
    for archive_kind, zip_path in archive_specs:
        archive_entries, archive_ignored = build_archive_entries(zip_path, archive_kind)
        entries.extend(archive_entries)
        ignored.extend(archive_ignored)
        source_archives.append({
            "sourceArchiveKind": archive_kind,
            "nameFingerprint": hashlib.sha256(zip_path.name.encode("utf-8", errors="replace")).hexdigest(),
        })

    summary = summarize_entries(entries, ignored)
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceFamily": "Hong Kong UP junior S1-S3 Chinese resource packs",
        "sourceArchives": source_archives,
        "safetyNote": SAFETY_NOTE,
        **summary,
        "entries": entries,
        "ignoredEntries": ignored,
    }


def qa_report(manifest: dict[str, object]) -> str:
    totals = manifest["totals"]  # type: ignore[index]
    coverage = manifest["coverage"]  # type: ignore[index]
    return "\n".join([
        "# HK UP Junior Resource Local Manifest QA",
        "",
        f"- Generated at: {manifest['generatedAt']}",
        f"- Entries inspected: {totals['entries']}",
        f"- DOCX files: {totals['docxFiles']}",
        f"- Ignored metadata entries: {totals['ignoredEntries']}",
        f"- Missing expected volumes: {json.dumps(coverage['missingExpectedVolumes'], ensure_ascii=False)}",
        f"- Junior DSE set count: {coverage['juniorDseSetCount']} of {coverage['expectedJuniorDseSetCount']}",
        f"- Safety note: {SAFETY_NOTE}",
        "",
        "## Safety Gate",
        "",
        "- Passed: output artifacts contain archive-kind metadata, checksums, size signals, volume/grade signals, material-kind signals, role signals, and aggregate coverage only.",
        "- Passed: no DOCX body text, document XML text, protected prompt wording, worked-response wording, teacher-note wording, figures, tables, member paths, page locators, or vector payloads are extracted or persisted.",
        "- Required before student-facing production use: S18 source-distance review of safe abstraction cards and generated output.",
        "",
    ]) + "\n"


def write_outputs(manifest: dict[str, object], out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / "qa-report.md").write_text(qa_report(manifest), encoding="utf-8")


def create_self_test_zips(root: Path) -> tuple[Path, Path, Path]:
    worksheet_zip = root / "worksheets.zip"
    challenge_zip = root / "challenge.zip"
    junior_dse_zip = root / "junior-dse.zip"

    with ZipFile(worksheet_zip, "w", compression=ZIP_DEFLATED) as archive:
        archive.writestr("__MACOSX/root/._ignored.docx", b"ignored")
        archive.writestr("root/1A01_LessonWS_SB_c/LessonWS_1A01_01c.docx", b"fake worksheet")
        archive.writestr("root/1A01_LessonWS_TE_c/LessonWS_1A01_TE_01c.docx", b"fake teacher support")
        archive.writestr("root/2B08_LessonWS_GuidedSB_c/[Guide]LessonWS_2B08_01c.docx", b"fake guided")
        archive.writestr("root/LessonWS_intro_C.docx", b"fake intro")

    with ZipFile(challenge_zip, "w", compression=ZIP_DEFLATED) as archive:
        archive.writestr("root/Challenging_3A05_c.docx", b"fake challenge")
        archive.writestr("root/Challenging_3A05_TE_c.docx", b"fake challenge teacher")
        archive.writestr("root/Challenging_3A05_Sol_c.docx", b"fake response support")

    with ZipFile(junior_dse_zip, "w", compression=ZIP_DEFLATED) as archive:
        archive.writestr("root/Junior_DSE_01c-2025.docx", b"fake junior dse")
        archive.writestr("root/Junior_DSE_Sol_01c-2025.docx", b"fake junior dse support")
        archive.writestr("root/Junior_DSE_List_c.docx", b"fake junior dse index")

    return worksheet_zip, challenge_zip, junior_dse_zip


def run_self_test() -> None:
    with tempfile.TemporaryDirectory() as temp_dir:
        worksheet_zip, challenge_zip, junior_dse_zip = create_self_test_zips(Path(temp_dir))
        manifest = build_manifest(worksheet_zip, challenge_zip, junior_dse_zip)

    assert manifest["totals"]["entries"] == 10, manifest["totals"]
    assert manifest["totals"]["docxFiles"] == 10, manifest["totals"]
    assert manifest["totals"]["ignoredEntries"] == 1, manifest["totals"]
    assert manifest["materialKindCounts"] == {
        "challenge-practice": 3,
        "junior-dse-type-practice": 3,
        "lesson-worksheet": 4,
    }, manifest["materialKindCounts"]
    assert manifest["sourceRoleCounts"]["student-practice"] == 3, manifest["sourceRoleCounts"]
    assert manifest["sourceRoleCounts"]["teacher-support"] == 2, manifest["sourceRoleCounts"]
    assert manifest["sourceRoleCounts"]["guided-student"] == 1, manifest["sourceRoleCounts"]
    assert manifest["sourceRoleCounts"]["response-support"] == 2, manifest["sourceRoleCounts"]
    assert manifest["volumeCounts"]["1A"] == 2, manifest["volumeCounts"]
    assert manifest["volumeCounts"]["2B"] == 1, manifest["volumeCounts"]
    assert manifest["volumeCounts"]["3A"] == 3, manifest["volumeCounts"]
    assert manifest["gradeCounts"]["S1"] == 2, manifest["gradeCounts"]
    assert manifest["gradeCounts"]["S2"] == 1, manifest["gradeCounts"]
    assert manifest["gradeCounts"]["S3"] == 3, manifest["gradeCounts"]
    assert manifest["coverage"]["lessonWorksheetUnitCountsByVolume"] == {"1A": 1, "2B": 1}, manifest["coverage"]
    assert manifest["coverage"]["challengePracticeUnitCountsByVolume"] == {"3A": 1}, manifest["coverage"]
    assert manifest["coverage"]["juniorDseSetCount"] == 1, manifest["coverage"]
    serialized = json.dumps(manifest, ensure_ascii=False)
    for forbidden in ["entryPath", "fileName", "LessonWS_1A01", "Challenging_3A05", "Junior_DSE_01"]:
        assert forbidden not in serialized
    print("Self-test passed: HK UP junior manifest builder classified DOCX metadata safely.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build local-only HK UP junior resource metadata artifacts.")
    parser.add_argument("--worksheet-zip", help="Path to the Chinese classroom worksheet ZIP.")
    parser.add_argument("--challenge-zip", help="Path to the Chinese challenge-practice ZIP.")
    parser.add_argument("--junior-dse-zip", help="Path to the Chinese junior-DSE-type practice ZIP.")
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR), help="Output directory. Defaults to ignored .local/rag/hk-up-junior-resources/.")
    parser.add_argument("--self-test", action="store_true", help="Run an in-memory metadata-only smoke test.")
    args = parser.parse_args()

    if args.self_test:
        run_self_test()
        return

    required = {
        "--worksheet-zip": args.worksheet_zip,
        "--challenge-zip": args.challenge_zip,
        "--junior-dse-zip": args.junior_dse_zip,
    }
    missing_args = [name for name, value in required.items() if not value]
    if missing_args:
        raise SystemExit(f"Missing required archive argument: {missing_args[0]}")

    paths = [Path(args.worksheet_zip), Path(args.challenge_zip), Path(args.junior_dse_zip)]
    missing_paths = [str(path) for path in paths if not path.expanduser().exists()]
    if missing_paths:
        raise SystemExit(f"Archive path not found: {missing_paths[0]}")

    manifest = build_manifest(*(path.expanduser().resolve() for path in paths))
    write_outputs(manifest, Path(args.out_dir).expanduser())
    totals = manifest["totals"]
    print(
        "Wrote local HK UP junior resource manifest with "
        f"{totals['docxFiles']} DOCX files and {totals['ignoredEntries']} ignored metadata entries "
        f"to {args.out_dir}"
    )


if __name__ == "__main__":
    main()
