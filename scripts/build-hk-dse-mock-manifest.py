#!/usr/bin/env python3
"""Build a local-only metadata manifest for HK DSE mock-paper PDFs.

The script reads ZIP directory metadata and streamed entry bytes for checksums.
It does not extract PDFs, parse PDF text, machine-read scans, persist source
content, or create embeddings.
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


DEFAULT_OUTPUT = Path(".local/rag/hk-dse-mock/manifest.json")
EXPECTED_YEARS = [2011, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020]
SAFETY_NOTE = (
    "Local metadata and checksums only; no PDF text, OCR text, source items, "
    "option sets, diagrams, tables, answers, solutions, worked responses, "
    "page locators, publisher routing, or embeddings are extracted or persisted."
)


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


def exam_family_and_year(file_name: str) -> tuple[str, int | None]:
    family_match = re.search(r"\b(DSE|CE)\s*([0-9]{2})\b", file_name, flags=re.IGNORECASE)
    if not family_match:
        family_match = re.search(r"\b(DSE|CE)([0-9]{2})", file_name, flags=re.IGNORECASE)
    if not family_match:
        return ("unknown", None)

    family = family_match.group(1).upper()
    year = 2000 + int(family_match.group(2))
    return (family, year)


def paper_component_from_name(file_name: str) -> str:
    normalized = file_name.lower()
    if re.search(r"p\s*1", normalized):
        return "paper-1"
    if re.search(r"p\s*2", normalized):
        return "paper-2"
    return "unknown"


def entry_kind_from_name(file_name: str) -> str:
    return "solution" if re.search(r"sol", file_name, flags=re.IGNORECASE) else "paper"


def set_number_from_name(file_name: str) -> int | None:
    set_match = re.search(r"set\s*([0-9]+)", file_name, flags=re.IGNORECASE)
    if not set_match:
        return None
    return int(set_match.group(1))


def filename_language_signal(file_name: str) -> str:
    compact = re.sub(r"[^a-z0-9]", "", file_name.lower())
    if re.search(r"p[12]e(?:set|sol|$)", compact) or re.search(r"p[12]sole", compact):
        return "en"
    if re.search(r"p[12]c(?:set|sol|$)", compact) or re.search(r"p[12]solc", compact):
        return "c-signal-review-needed"
    return "unknown"


def build_archive_entries(zip_path: Path) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    entries: list[dict[str, object]] = []
    ignored: list[dict[str, object]] = []
    with ZipFile(zip_path) as archive:
        for info in archive.infolist():
            if info.is_dir():
                continue

            file_name = Path(info.filename).name
            if is_junk_path(info.filename):
                ignored.append({
                    "pathFingerprint": hashlib.sha256(info.filename.encode("utf-8", errors="replace")).hexdigest(),
                    "fileName": file_name,
                    "sizeBytes": info.file_size,
                    "reason": "macos-or-hidden-metadata",
                })
                continue

            extension = Path(file_name).suffix.lower() or "<none>"
            exam_family, year = exam_family_and_year(file_name)
            paper_component = paper_component_from_name(file_name)
            entry_kind = entry_kind_from_name(file_name)
            language_signal = filename_language_signal(file_name)
            review_flags = []
            if extension != ".pdf":
                review_flags.append("non-pdf")
            if exam_family == "unknown" or year is None:
                review_flags.append("unknown-exam-family-or-year")
            if paper_component == "unknown":
                review_flags.append("unknown-paper-component")
            if entry_kind not in {"paper", "solution"}:
                review_flags.append("unknown-mock-entry-kind")
            if language_signal == "c-signal-review-needed":
                review_flags.append("filename-language-review-needed")

            entries.append({
                "sourceArchive": zip_path.name,
                "sourceFamily": "hk-dse-mock-pack-en",
                "ownerDeclaredLanguage": "en",
                "pathFingerprint": hashlib.sha256(info.filename.encode("utf-8", errors="replace")).hexdigest(),
                "fileName": file_name,
                "examFamily": exam_family,
                "year": year,
                "paperComponent": paper_component,
                "entryKind": entry_kind,
                "setNumber": set_number_from_name(file_name),
                "filenameLanguageSignal": language_signal,
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


def group_duplicate_hashes(entries: list[dict[str, object]]) -> list[dict[str, object]]:
    grouped: dict[str, list[dict[str, object]]] = defaultdict(list)
    for entry in entries:
        grouped[str(entry["sha256"])].append({
            "ownerDeclaredLanguage": str(entry["ownerDeclaredLanguage"]),
            "examFamily": str(entry["examFamily"]),
            "year": entry["year"],
            "paperComponent": str(entry["paperComponent"]),
            "entryKind": str(entry["entryKind"]),
            "fileName": str(entry["fileName"]),
        })
    return [
        {"sha256": digest, "entries": items}
        for digest, items in sorted(grouped.items())
        if len(items) > 1
    ]


def summarize_pairing(entries: list[dict[str, object]]) -> list[dict[str, object]]:
    paired: dict[int, Counter[str]] = defaultdict(Counter)
    for entry in entries:
        year = entry["year"]
        if isinstance(year, int):
            paired[year][str(entry["entryKind"])] += 1

    all_years = sorted(set(EXPECTED_YEARS) | set(paired.keys()))
    return [
        {
            "year": year,
            "paperCount": paired[year]["paper"],
            "solutionCount": paired[year]["solution"],
            "missingKinds": [
                kind
                for kind in ("paper", "solution")
                if paired[year][kind] == 0
            ],
        }
        for year in all_years
    ]


def summarize_entries(entries: list[dict[str, object]], ignored: list[dict[str, object]]) -> dict[str, object]:
    retained_years = sorted(
        int(entry["year"])
        for entry in entries
        if isinstance(entry["year"], int)
    )
    unique_retained_years = sorted(set(retained_years))
    year_pairing = summarize_pairing(entries)

    return {
        "totals": {
            "entries": len(entries),
            "ignoredEntries": len(ignored),
            "pdfFiles": sum(1 for entry in entries if entry["extension"] == ".pdf"),
            "uncompressedBytes": sum(int(entry["sizeBytes"]) for entry in entries),
        },
        "ownerDeclaredLanguageCounts": dict(sorted(Counter(str(entry["ownerDeclaredLanguage"]) for entry in entries).items())),
        "filenameLanguageSignalCounts": dict(sorted(Counter(str(entry["filenameLanguageSignal"]) for entry in entries).items())),
        "examFamilyCounts": dict(sorted(Counter(str(entry["examFamily"]) for entry in entries).items())),
        "yearCounts": dict(sorted(Counter(str(entry["year"]) for entry in entries).items())),
        "componentCounts": dict(sorted(Counter(str(entry["paperComponent"]) for entry in entries).items())),
        "entryKindCounts": dict(sorted(Counter(str(entry["entryKind"]) for entry in entries).items())),
        "extensionCounts": dict(sorted(Counter(str(entry["extension"]) for entry in entries).items())),
        "yearCoverage": {
            "retainedYears": unique_retained_years,
            "expectedYears": EXPECTED_YEARS,
            "missingExpectedYears": sorted(set(EXPECTED_YEARS) - set(unique_retained_years)),
            "unexpectedYears": sorted(set(unique_retained_years) - set(EXPECTED_YEARS)),
        },
        "yearPairing": year_pairing,
        "anomalies": {
            "unknownEntries": [
                {
                    "fileName": str(entry["fileName"]),
                    "year": entry["year"],
                    "paperComponent": str(entry["paperComponent"]),
                    "entryKind": str(entry["entryKind"]),
                    "reviewFlags": entry["reviewFlags"],
                }
                for entry in entries
                if entry["reviewFlags"]
            ],
            "incompletePairs": [
                pair
                for pair in year_pairing
                if pair["paperCount"] != 1 or pair["solutionCount"] != 1
            ],
            "nonPaper1Entries": [
                {
                    "fileName": str(entry["fileName"]),
                    "year": entry["year"],
                    "paperComponent": str(entry["paperComponent"]),
                }
                for entry in entries
                if entry["paperComponent"] != "paper-1"
            ],
            "duplicateHashes": group_duplicate_hashes(entries),
        },
    }


def build_manifest(zip_path: Path) -> dict[str, object]:
    entries, ignored = build_archive_entries(zip_path)
    summary = summarize_entries(entries, ignored)
    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceArchive": {"ownerDeclaredLanguage": "en", "name": zip_path.name},
        "sourceFamily": "Hong Kong DSE Mathematics mock-paper pack, owner-declared English",
        "publisherNeutrality": "Local path publisher names are source-location signals only and are not RAG routing dimensions.",
        "safetyNote": SAFETY_NOTE,
        **summary,
        "entries": entries,
        "ignoredEntries": ignored,
    }


def write_manifest(manifest: dict[str, object], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def create_self_test_zip(path: Path) -> None:
    with ZipFile(path, "w", compression=ZIP_DEFLATED) as archive:
        archive.writestr("__MACOSX/root/._junk", "ignored")
        archive.writestr("root/.DS_Store", "ignored")
        for year in EXPECTED_YEARS:
            prefix = "CE" if year == 2011 else "DSE"
            short_year = str(year)[-2:]
            archive.writestr(
                f"root/Publisher path ignored/{year}/{prefix}{short_year}_Compulsory_P1C_set1.pdf",
                f"%PDF-1.4\nself-test paper metadata {year}\n",
            )
            archive.writestr(
                f"root/Publisher path ignored/{year}/{prefix}{short_year}_Compulsory_P1solC_set1.pdf",
                f"%PDF-1.4\nself-test checking metadata {year}\n",
            )


def run_self_test() -> None:
    with tempfile.TemporaryDirectory() as temp_dir:
        test_zip = Path(temp_dir) / "hk-dse-mock.zip"
        create_self_test_zip(test_zip)
        manifest = build_manifest(test_zip)

    assert manifest["totals"]["pdfFiles"] == 18, manifest["totals"]
    assert manifest["totals"]["ignoredEntries"] == 2, manifest["totals"]
    assert manifest["ownerDeclaredLanguageCounts"] == {"en": 18}, manifest["ownerDeclaredLanguageCounts"]
    assert manifest["filenameLanguageSignalCounts"] == {"c-signal-review-needed": 18}, manifest["filenameLanguageSignalCounts"]
    assert manifest["componentCounts"] == {"paper-1": 18}, manifest["componentCounts"]
    assert manifest["entryKindCounts"] == {"paper": 9, "solution": 9}, manifest["entryKindCounts"]
    assert manifest["examFamilyCounts"] == {"CE": 2, "DSE": 16}, manifest["examFamilyCounts"]
    coverage = manifest["yearCoverage"]
    assert coverage["retainedYears"] == EXPECTED_YEARS, coverage
    assert not coverage["missingExpectedYears"], coverage
    assert not coverage["unexpectedYears"], coverage
    assert not manifest["anomalies"]["incompletePairs"], manifest["anomalies"]
    assert not manifest["anomalies"]["nonPaper1Entries"], manifest["anomalies"]
    print("Self-test passed: HK DSE mock manifest recognized 18 Paper 1 metadata PDFs.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a local-only HK DSE mock-paper metadata manifest.")
    parser.add_argument("zip_path", nargs="?", help="Path to the DSE mock-paper ZIP archive.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="Output path for the local manifest JSON.")
    parser.add_argument("--self-test", action="store_true", help="Run the self-test with an in-memory ZIP fixture.")
    args = parser.parse_args()

    if args.self_test:
        run_self_test()
        return

    if not args.zip_path:
        parser.error("zip_path is required unless --self-test is used")

    zip_path = Path(args.zip_path).expanduser().resolve()
    manifest = build_manifest(zip_path)
    output_path = Path(args.output)
    write_manifest(manifest, output_path)
    print(json.dumps({
        "sourceArchive": manifest["sourceArchive"],
        "outputPath": str(output_path),
        "totals": manifest["totals"],
        "yearCoverage": manifest["yearCoverage"],
        "yearPairing": manifest["yearPairing"],
        "componentCounts": manifest["componentCounts"],
        "entryKindCounts": manifest["entryKindCounts"],
        "filenameLanguageSignalCounts": manifest["filenameLanguageSignalCounts"],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
