#!/usr/bin/env python3
"""Build a local-only metadata manifest for Hong Kong DSE Mathematics papers.

The script reads ZIP directory metadata and streamed entry bytes for checksums.
It does not extract PDFs, parse PDF text, machine-read scans, or persist source content.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import tempfile
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED


DEFAULT_OUTPUT = Path(".local/rag/hk-dse/hk-dse-math-manifest.json")
EXPECTED_YEARS = [str(year) for year in range(2012, 2024)]
EXPECTED_COMPONENTS_WITH_ANS = {"p1.pdf", "p2.pdf", "ans.pdf"}
EXPECTED_COMPONENTS_2023 = {"p1.pdf", "p2.pdf"}


def iso_modified_at(date_time: tuple[int, int, int, int, int, int]) -> str:
    year, month, day, hour, minute, second = date_time
    return datetime(year, month, day, hour, minute, second, tzinfo=timezone.utc).isoformat()


def is_junk_path(path: str) -> bool:
    parts = path.split("/")
    file_name = parts[-1]
    return parts[0] == "__MACOSX" or file_name == ".DS_Store" or file_name.startswith("._")


def year_from_path(path: str) -> str:
    for part in path.split("/"):
        if part.isdigit() and len(part) == 4:
            return part
    return "unknown"


def component_from_file_name(file_name: str) -> str:
    lower = file_name.lower()
    if lower == "p1.pdf":
        return "paper-1"
    if lower == "p2.pdf" or lower.startswith("p2_"):
        return "paper-2"
    if lower == "ans.pdf":
        return "answer-file"
    return "unknown"


def sha256_entry(archive: ZipFile, path: str) -> str:
    digest = hashlib.sha256()
    with archive.open(path) as handle:
        while True:
            chunk = handle.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def build_archive_entries(zip_path: Path, language_variant: str) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    entries: list[dict[str, object]] = []
    ignored: list[dict[str, object]] = []
    with ZipFile(zip_path) as archive:
        for info in archive.infolist():
            if info.is_dir():
                continue

            file_name = Path(info.filename).name
            if is_junk_path(info.filename):
                ignored.append({
                    "path": info.filename,
                    "sizeBytes": info.file_size,
                    "reason": "macos-or-hidden-metadata",
                })
                continue

            extension = Path(file_name).suffix.lower() or "<none>"
            year = year_from_path(info.filename)
            component = component_from_file_name(file_name)
            review_flags = []
            if extension != ".pdf":
                review_flags.append("non-pdf")
            if year == "unknown":
                review_flags.append("missing-year")
            if component == "unknown":
                review_flags.append("unknown-component")
            if file_name.lower().startswith("p2_"):
                review_flags.append("paper-2-variant-review-needed")

            entries.append({
                "sourceArchive": zip_path.name,
                "languageVariant": language_variant,
                "pathFingerprint": hashlib.sha256(info.filename.encode("utf-8", errors="replace")).hexdigest(),
                "fileName": file_name,
                "year": year,
                "paperComponent": component,
                "extension": extension,
                "sizeBytes": info.file_size,
                "zipCrc32": f"{info.CRC:08x}",
                "sha256": sha256_entry(archive, info.filename),
                "modifiedAt": iso_modified_at(info.date_time),
                "retention": "local-metadata-only",
                "reviewFlags": review_flags,
            })

    return entries, ignored


def expected_components_for_year(year: str) -> set[str]:
    return EXPECTED_COMPONENTS_2023 if year == "2023" else EXPECTED_COMPONENTS_WITH_ANS


def summarize_entries(entries: list[dict[str, object]], ignored: list[dict[str, object]]) -> dict[str, object]:
    by_language = Counter(str(entry["languageVariant"]) for entry in entries)
    by_year: dict[str, list[dict[str, object]]] = defaultdict(list)
    for entry in entries:
        by_year[str(entry["year"])].append(entry)

    year_component_counts: dict[str, dict[str, int]] = {}
    missing_expected: list[dict[str, object]] = []
    known_missing_answer_files: list[dict[str, object]] = []
    extra_variants: list[dict[str, object]] = []
    for language in sorted(by_language):
        language_entries = [entry for entry in entries if entry["languageVariant"] == language]
        for year in EXPECTED_YEARS:
            file_names = [str(entry["fileName"]).lower() for entry in language_entries if entry["year"] == year]
            components = Counter(str(entry["paperComponent"]) for entry in language_entries if entry["year"] == year)
            year_component_counts[f"{language}:{year}"] = dict(sorted(components.items()))
            expected = expected_components_for_year(year)
            missing = sorted(expected - set(file_names))
            if missing:
                missing_expected.append({
                    "languageVariant": language,
                    "year": year,
                    "missingFiles": missing,
                })
            if year == "2023" and "ans.pdf" not in set(file_names):
                known_missing_answer_files.append({
                    "languageVariant": language,
                    "year": year,
                    "missingFiles": ["ans.pdf"],
                    "reason": "provided-archive-has-papers-without-answer-file",
                })
            variants = sorted(file_name for file_name in file_names if file_name.startswith("p2_"))
            if variants:
                extra_variants.append({
                    "languageVariant": language,
                    "year": year,
                    "variantFiles": variants,
                })

    duplicate_hashes = [
        {"sha256": digest, "entries": grouped}
        for digest, grouped in sorted(_group_duplicate_hashes(entries).items())
        if len(grouped) > 1
    ]

    return {
        "totals": {
            "entries": len(entries),
            "ignoredEntries": len(ignored),
            "pdfFiles": sum(1 for entry in entries if entry["extension"] == ".pdf"),
            "uncompressedBytes": sum(int(entry["sizeBytes"]) for entry in entries),
        },
        "languageCounts": dict(sorted(by_language.items())),
        "yearCounts": dict(sorted(Counter(str(entry["year"]) for entry in entries).items())),
        "componentCounts": dict(sorted(Counter(str(entry["paperComponent"]) for entry in entries).items())),
        "extensionCounts": dict(sorted(Counter(str(entry["extension"]) for entry in entries).items())),
        "yearComponentCounts": year_component_counts,
        "expectedYears": EXPECTED_YEARS,
        "anomalies": {
            "missingExpectedFiles": missing_expected,
            "knownMissingAnswerFiles": known_missing_answer_files,
            "extraPaper2Variants": extra_variants,
            "duplicateHashes": duplicate_hashes,
        },
    }


def _group_duplicate_hashes(entries: list[dict[str, object]]) -> dict[str, list[dict[str, str]]]:
    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
    for entry in entries:
        grouped[str(entry["sha256"])].append({
            "sourceArchive": str(entry["sourceArchive"]),
            "languageVariant": str(entry["languageVariant"]),
            "year": str(entry["year"]),
            "fileName": str(entry["fileName"]),
            "paperComponent": str(entry["paperComponent"]),
        })
    return grouped


def build_manifest(english_zip_path: Path, chinese_zip_path: Path) -> dict[str, object]:
    english_entries, english_ignored = build_archive_entries(english_zip_path, "en")
    chinese_entries, chinese_ignored = build_archive_entries(chinese_zip_path, "zh")
    entries = english_entries + chinese_entries
    ignored = english_ignored + chinese_ignored
    summary = summarize_entries(entries, ignored)
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceArchives": [
            {"languageVariant": "en", "name": english_zip_path.name},
            {"languageVariant": "zh", "name": chinese_zip_path.name},
        ],
        "safetyNote": "Local metadata and checksums only; no PDF text, machine-read scans, figures, tables, source items, option sets, worked responses, marking wording, source locators, or embeddings are extracted or persisted.",
        **summary,
        "entries": entries,
        "ignoredEntries": ignored,
    }


def write_manifest(manifest: dict[str, object], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def create_self_test_zip(path: Path, include_variant: bool) -> None:
    with ZipFile(path, "w", compression=ZIP_DEFLATED) as archive:
        archive.writestr("__MACOSX/root/._junk", "ignored")
        archive.writestr("root/.DS_Store", "ignored")
        for year in EXPECTED_YEARS:
            files = ["p1.pdf", "p2.pdf"]
            if year != "2023":
                files.append("ans.pdf")
            if include_variant and year == "2018":
                files.append("p2_20231205_160528.pdf")
            for file_name in files:
                archive.writestr(f"root/{year}/{file_name}", f"%PDF-1.4\nself-test {year} {file_name}\n")


def run_self_test() -> None:
    with tempfile.TemporaryDirectory() as temp_dir:
        english_zip = Path(temp_dir) / "dse-en.zip"
        chinese_zip = Path(temp_dir) / "dse-zh.zip"
        create_self_test_zip(english_zip, include_variant=True)
        create_self_test_zip(chinese_zip, include_variant=False)
        manifest = build_manifest(english_zip, chinese_zip)

    assert manifest["totals"]["pdfFiles"] == 71, manifest["totals"]
    assert manifest["languageCounts"] == {"en": 36, "zh": 35}, manifest["languageCounts"]
    assert manifest["expectedYears"] == EXPECTED_YEARS, manifest["expectedYears"]
    anomalies = manifest["anomalies"]
    assert len(anomalies["knownMissingAnswerFiles"]) == 2, anomalies
    assert len(anomalies["extraPaper2Variants"]) == 1, anomalies
    assert anomalies["extraPaper2Variants"][0]["languageVariant"] == "en", anomalies
    assert not anomalies["missingExpectedFiles"], anomalies
    assert manifest["totals"]["ignoredEntries"] == 4, manifest["totals"]
    print("Self-test passed: HK DSE manifest builder recognized 36 English PDFs and 35 Chinese PDFs.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a local-only Hong Kong DSE Mathematics manifest.")
    parser.add_argument("english_zip_path", nargs="?", help="Path to the English DSE Mathematics ZIP archive.")
    parser.add_argument("chinese_zip_path", nargs="?", help="Path to the Chinese DSE Mathematics ZIP archive.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="Output JSON path. Defaults to ignored .local/rag/hk-dse/.")
    parser.add_argument("--self-test", action="store_true", help="Run an in-memory fixture test without reading external files.")
    args = parser.parse_args()

    if args.self_test:
        run_self_test()
        return

    if not args.english_zip_path or not args.chinese_zip_path:
        raise SystemExit("Both English and Chinese ZIP paths are required unless --self-test is used.")

    english_zip_path = Path(args.english_zip_path).expanduser().resolve()
    chinese_zip_path = Path(args.chinese_zip_path).expanduser().resolve()
    output_path = Path(args.output).expanduser()
    if not english_zip_path.exists():
        raise SystemExit(f"English ZIP archive not found: {english_zip_path}")
    if not chinese_zip_path.exists():
        raise SystemExit(f"Chinese ZIP archive not found: {chinese_zip_path}")

    manifest = build_manifest(english_zip_path, chinese_zip_path)
    write_manifest(manifest, output_path)
    totals = manifest["totals"]
    print(
        "Wrote local HK DSE manifest with "
        f"{totals['pdfFiles']} PDFs ({manifest['languageCounts']}) to {output_path}"
    )


if __name__ == "__main__":
    main()
